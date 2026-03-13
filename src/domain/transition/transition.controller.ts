import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { TransitionService } from './transition.service';
import { CreateTransitionDto, FindTransitionsDto } from './dto';

@Controller('transition')
export class TransitionController {
  constructor(private readonly transitionService: TransitionService) {}

  @Post()
  async createTransition(@Body() dto: CreateTransitionDto) {
    return this.transitionService.create(dto);
  }

  @Get()
  async getAllTransition(@Query() dto: FindTransitionsDto) {
    return this.transitionService.findAllTransition(dto);
  }

  @Get(':id')
  async getOneTransition(@Param('id') id: string) {
    return this.transitionService.findOneBy({ id });
  }
}
