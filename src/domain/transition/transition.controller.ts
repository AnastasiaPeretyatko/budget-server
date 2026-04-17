import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TransitionService } from './transition.service';
import { CreateTransitionDto, FindTransitionsDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transition')
@UseGuards(JwtAuthGuard)
export class TransitionController {
  constructor(private readonly transitionService: TransitionService) {}

  @Post()
  async createTransition(@Body() dto: CreateTransitionDto) {
    return this.transitionService.create(dto);
  }

  @Post('/all')
  async getAllTransition(@Body() dto: FindTransitionsDto) {
    return this.transitionService.findAllTransition(dto);
  }

  @Get(':id')
  async getOneTransition(@Param('id') id: string) {
    return this.transitionService.findOneBy({ id });
  }
}
