import { IsNotEmpty, IsEmail, Length, IsString } from "class-validator"

export class SignInDto {
    @IsNotEmpty()
    @IsEmail()
    email: string
  
    @IsNotEmpty()
    @IsString()
    @Length(8, 16)
    password: string
}
