import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { SavingAccountService } from './savings_account.service';

type SavingAccountType = {
  name: string;
  description: string;
  amount: string;
};

@Controller('saving')
export class SavingAccountController {
  constructor(private readonly savingAccountService: SavingAccountService) {}

  @Post()
  async create(@Body() dto: SavingAccountType) {
    return await this.savingAccountService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: SavingAccountType) {
    return await this.savingAccountService.update({ id, ...dto });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.savingAccountService.delete(id);
  }

  @Get('all')
  async getAll() {
    return await this.savingAccountService.getAll();
  }
}
