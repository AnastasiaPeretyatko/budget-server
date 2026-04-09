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
import { CategoryService } from './category.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

type Category = { name: string; description?: string };

@Controller('category')
@UseGuards(JwtAuthGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  async create(@Body() dto: Category) {
    return await this.categoryService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: Category) {
    return await this.categoryService.update({ id, ...dto });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return await this.categoryService.delete(id);
  }

  @Get('all')
  async getAll() {
    return await this.categoryService.getAll();
  }
}
