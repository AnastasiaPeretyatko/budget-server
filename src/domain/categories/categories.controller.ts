import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type Category = { name: string; description?: string };

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post()
  async create(@Body() dto: Category) {
    return await this.categoriesService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Category) {
    return await this.categoriesService.update({ id, ...dto });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.categoriesService.delete(id);
  }

  @Get('all')
  async getAll() {
    return await this.categoriesService.getAll();
  }
}
