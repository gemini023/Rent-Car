import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import * as bcrypt from "bcrypt"
import { PrismaService } from 'src/prisma/prisma.service';
import * as otpGenerator from "otp-generator"
import { MailService } from 'src/mail/mail.service';
import { OtpDto } from './dto/otp.dto';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RevokeTokenDto } from './dto/revoke-token.dto';
import { UserRole } from '@prisma/client';
import { UpdatePasswordDto } from './dto/update-password.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailSerivce: MailService,
    private readonly jwtService: JwtService
  ) { }

  async generateOtp(length: number = 6): Promise<number> {
    return otpGenerator.generate(length, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
  }

  async signUp(signUpDto: SignUpDto) {
    const { email, password, fullName } = signUpDto;
    const hashedPassword = await bcrypt.hash(password, 13);

    const newUser = await this.prisma.users.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
      }
    });

    const otp = await this.generateOtp(5)

    await this.prisma.otps.create({
      data: {
        otp: +otp,
        userId: newUser.id,
        expiresAt: new Date(Date.now() + 3 * 60 * 1000)
      }
    })

    await this.mailSerivce.sendMail(
      email,
      "Verification code!",
      `Here is your ${otp} code.`,
    )

    return {
      message: "User created and OTP send to email.",
      userId: newUser.id
    }
  }


  async verifyOtp(otpDto: OtpDto) {
    const userOtp = await this.prisma.otps.findFirst({
      where: {
        userId: otpDto.userId,
        otp: otpDto.otp,
        expiresAt: { gt: new Date() }
      }
    })

    if (!userOtp) {
      throw new UnauthorizedException("User with current ID is not registered.")
    }

    if (userOtp.otp !== otpDto.otp) {
      throw new BadRequestException("Invalid OTP!")
    }


    await this.prisma.users.updateMany({
      where: { id: userOtp.userId },
      data: {
        isActive: true,
        role: UserRole.client
      }
    })

    await this.prisma.otps.delete({ where: { id: userOtp.id } })

    return {
      message: "User successfully verified!"
    }

  }

  async signIn(signInDto: SignInDto): Promise<{ accessToken: string, refreshToken: string }> {
    const user = await this.prisma.users.findUnique({
      where: { email: signInDto.email }
    })

    if (!user) {
      throw new NotFoundException("Invalid email or password!")
    }

    if (user.isActive !== true) {
      throw new UnauthorizedException("User is not verified!")
    }


    const passwordCompare = await bcrypt.compare(signInDto.password, user.password)
    if (!passwordCompare) {
      throw new UnauthorizedException("Invalid email or password!")
    }

    const payload = { email: user.email, sub: user.id }
    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN
    })
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN
    })

    await this.prisma.refresh_tokens.deleteMany({
      where: { userId: user.id }
    })

    await this.prisma.refresh_tokens.create({
      data: {
        userId: user.id,
        refresh_token: refreshToken,
        expiresAt: new Date(Date.now() + parseInt(process.env.JWT_REFRESH_EXPIRES_IN) * 1000)
      }
    })

    return {
      accessToken,
      refreshToken
    }
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<{ accessToken: string, refreshToken: string }> {
    const { refresh_token } = refreshTokenDto

    const decodedToken = this.jwtService.verify(refresh_token, {
      secret: process.env.JWT_REFRESH_SECRET
    })

    const storedToken = await this.prisma.refresh_tokens.findFirst({
      where: {
        userId: decodedToken.sub,
        refresh_token: refresh_token
      }
    })

    if (!storedToken)
      throw new UnauthorizedException("Invalid refresh token!")

    const user = await this.prisma.users.findUnique({
      where: { id: decodedToken.sub }
    })

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    const payload = { email: user.email, sub: user.id };
    const newAccessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN,
    });
    const newRefreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN,
    });

    await this.prisma.refresh_tokens.update(({
      where: { id: storedToken.id },
      data: { refresh_token: newRefreshToken }
    }))

    return { accessToken: newAccessToken, refreshToken: newRefreshToken }

  }

  async revokeToken(revokeTokenDto: RevokeTokenDto) {
    const { refresh_token } = revokeTokenDto

    const storedToken = await this.prisma.refresh_tokens.findFirst({
      where: { refresh_token: refresh_token }
    })

    if (!storedToken) {
      throw new UnauthorizedException("Invalid refresh token!")
    }

    await this.prisma.refresh_tokens.delete({
      where: { id: storedToken.id }
    })

    return { message: "Refresh token revoked successfully." }
  }

  async updatePassword(updatePasswordDto: UpdatePasswordDto) {
    const { old_password, new_password, confirm_password, id } = updatePasswordDto

    if (!id) {
      throw new BadRequestException("User ID is required.");
    }
  
    const user = await this.prisma.users.findUnique({
      where: { id }
    })

    if (!user) {
      throw new NotFoundException("User not found.")
    }

    const comparePassword = await bcrypt.compare(old_password, user.password)
    if (!comparePassword) {
      throw new BadRequestException("Invalid old password.")
    }

    if (new_password !== confirm_password) {
      throw new BadRequestException("New password and confirm password do not match.")
    }

    const createNewPassword = await bcrypt.hash(new_password, 13)

    await this.prisma.users.update({
      where: { id: id },
      data: { password: createNewPassword }
    })

    return { message: "Password successfully updated." }

  }

}