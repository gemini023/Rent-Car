import { IsEmail, IsNotEmpty, IsString, Length, IsOptional, IsBoolean } from "class-validator";
import { Exclude } from "class-transformer";

export class SignUpDto {
    @IsString()
    @IsNotEmpty()
    fullName: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @Exclude()
    @IsString()
    @IsNotEmpty()
    @Length(8, 16)
    password: string;

    @IsString()
    @IsOptional()
    avatarUrl?: string;

    @IsString()
    @IsOptional()
    role?: string;

    @IsBoolean()
    isActive: boolean = false

}
