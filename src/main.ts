import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 4001

  const config = new DocumentBuilder()
    .setTitle('Rent Car API')
    .setDescription('Rent Car API docs')
    .setVersion('1.0')
    .addTag('rent-car')
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('rent', app, document);
  
  await app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}'s port.`)
  });
}
bootstrap();
  