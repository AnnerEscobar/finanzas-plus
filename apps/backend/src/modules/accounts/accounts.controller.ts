import { Controller, Get, Post, Body, Param, Put, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountsService } from './accounts.service';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private accountsService: AccountsService) {}

  @Post()
  create(@Body() accountData: any, @Request() req) {
    return this.accountsService.create(req.user.userId, accountData);
  }

  @Get()
  findByUser(@Request() req) {
    return this.accountsService.findByUserId(req.user.userId);
  }

  @Get('total')
  getTotalBalance(@Request() req) {
    return this.accountsService.getTotalBalance(req.user.userId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.accountsService.findById(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateData: any) {
    return this.accountsService.update(id, updateData);
  }
}
