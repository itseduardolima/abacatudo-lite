import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common'
import type { Person } from '@gastos/shared'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { CreatePersonDto } from './dto/create-person.dto'
import { PersonService } from './person.service'

@Controller('people')
export class PersonController {
  constructor(private readonly people: PersonService) {}

  @Post()
  create(@CurrentUser() userId: string, @Body() body: CreatePersonDto): Promise<Person> {
    return this.people.create(userId, body)
  }

  @Get()
  list(@CurrentUser() userId: string, @Query('includeArchived') includeArchived?: string): Promise<Person[]> {
    return this.people.list(userId, includeArchived === 'true')
  }

  @Patch(':id/archive')
  @HttpCode(204)
  archive(@CurrentUser() userId: string, @Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.people.archive(userId, id)
  }
}
