import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import type { NestExpressApplication } from '@nestjs/platform-express'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'
import { StructuredLogger } from './common/logger/structured-logger'

async function bootstrap() {
  // logger no create(): um erro de config durante a criação já sai estruturado e derruba o processo.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new StructuredLogger(),
    bodyParser: false,
  })
  const config = app.get(ConfigService)
  const isProduction = config.get<string>('NODE_ENV') === 'production'

  // Atrás do Caddy: sem isto o rate limit veria o IP do proxy e limitaria todo mundo junto (08 § 5).
  app.set('trust proxy', 1)
  app.disable('x-powered-by')
  // Limite explícito de payload (08-seguranca § 5). O import de OFX/CSV usa rota multipart própria.
  app.useBodyParser('json', { limit: '1mb' })
  app.use(cookieParser())
  // Sem CORS: web e API compartilham a origem (01-arquitetura § Um domínio só).

  // Documentação da API só fora de produção.
  if (!isProduction) {
    const swagger = new DocumentBuilder()
      .setTitle('AbacaTudo API')
      .setVersion('0.0.0')
      .addCookieAuth('__Host-gastos_session')
      .build()
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swagger))
  }

  app.enableShutdownHooks()
  await app.listen(config.get<number>('PORT', 3001))
}

void bootstrap()
