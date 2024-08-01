import { IsEmail, IsNotEmpty, IsString, Length } from "class-validator";

export class SignUpDto {

    @IsString()
    @IsNotEmpty()
    fullName: string

    @IsEmail()
    @IsNotEmpty()
    email: string

    @IsString()
    @IsNotEmpty()
    @Length(8, 16)
    password: string

}
