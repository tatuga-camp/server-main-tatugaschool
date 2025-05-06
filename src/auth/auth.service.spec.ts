import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { Response } from 'express';
import { AppController } from '../app.controller';
import { AppService } from '../app.service';
import { BadRequestException } from '@nestjs/common';
import { AppModule } from '../app.module';

type MockResponse = Partial<Response>;
describe('AuthService', () => {
  let authService: AuthService;
  let mockResponse: MockResponse; // Declare the mock response object

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    authService = moduleRef.get(AuthService);
    mockResponse = {
      cookie: jest.fn(), // Mock the cookie method
      status: jest.fn().mockReturnThis(), // Mock status and allow chaining
      send: jest.fn(), // Mock the send method
      json: jest.fn(),
      // Add any other methods your AuthService interacts with on the response
    };
  });

  describe('sign-up', () => {
    it('should successfully sign up', async () => {
      const ramdomEmail = `test${crypto.randomUUID()}@gmail.com`;
      await authService.signup(
        {
          email: ramdomEmail,
          provider: 'LOCAL',
          password: '1234568910',
          firstName: 'firstName',
          lastName: 'lastName',
          phone: '+66123456789',
        },
        mockResponse as Response,
      );
    });
    it('should throw error on password too short ', async () => {
      try {
        const ramdomEmail = `test${crypto.randomUUID()}@gmail.com`;
        await authService.signup(
          {
            email: ramdomEmail,
            provider: 'LOCAL',
            password: '1234568',
            firstName: 'firstName',
            lastName: 'lastName',
            phone: '+66123456789',
          },
          mockResponse as Response,
        );
      } catch (error) {
        console.log('error-test', error.response);
        expect(error).toBeInstanceOf(BadRequestException);
      }
    });
  });
});
