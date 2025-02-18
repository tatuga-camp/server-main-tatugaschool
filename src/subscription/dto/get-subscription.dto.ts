import { IsMongoId, IsNotEmpty } from "class-validator";

export class GetSubscriptionMangamentDto {
    @IsNotEmpty()
    @IsMongoId()
    schoolId: string
}