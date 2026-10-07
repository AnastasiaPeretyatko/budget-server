import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplateEntity } from './template.entity';
import { TemplateServise } from './template.service';
import { AuthModule } from '../auth/auth.module';
import { TagsModule } from '../tags/tags.module';

@Module({
  imports: [TypeOrmModule.forFeature([TemplateEntity]), AuthModule, TagsModule],
  providers: [TemplateServise],
  controllers: [TemplateController],
  exports: [TemplateServise],
})
export class TemplateModule {}
