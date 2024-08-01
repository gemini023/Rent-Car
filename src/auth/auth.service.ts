import { Injectable } from '@nestjs/common';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import * as bcrypt from "bcrypt"

@Injectable()
export class AuthService {
  constructor(
    private readonly signUpDto: SignUpDto,
    private readonly signInDto: SignInDto
  ) { }

  async signUp(signUpDto: SignUpDto) {
    const { email, password } = signUpDto
    const hashedPassword = await bcrypt.hash(password, 13)
  }

  findAll() {
    return `This action returns all auth`;
  }

  findOne(id: number) {
    return `This action returns a #${id} auth`;
  }

  update(id: number, updateAuthDto: SignInDto) {
    return `This action updates a #${id} auth`;
  }

  remove(id: number) {
    return `This action removes a #${id} auth`;
  }
}
