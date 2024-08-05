import { IsString } from 'class-validator';

export class RevokeTokenDto {
    @IsString()
    refresh_token: string
}