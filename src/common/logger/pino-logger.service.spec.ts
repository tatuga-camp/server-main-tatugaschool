import { PinoLoggerService } from './pino-logger.service';

type PinoFake = {
  info: jest.Mock;
  warn: jest.Mock;
  debug: jest.Mock;
  trace: jest.Mock;
  error: jest.Mock;
  fatal: jest.Mock;
};

function makePino(): PinoFake {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    trace: jest.fn(),
    error: jest.fn(),
    fatal: jest.fn(),
  };
}

describe('PinoLoggerService', () => {
  describe('log()', () => {
    it('forwards to pino.info with context in merge object', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);

      logger.log('hello world', 'BootstrapCtx');

      expect(pino.info).toHaveBeenCalledTimes(1);
      expect(pino.info).toHaveBeenCalledWith(
        { context: 'BootstrapCtx' },
        'hello world',
      );
    });

    it('forwards without context when caller omits it', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);

      logger.log('hello world');

      expect(pino.info).toHaveBeenCalledWith(
        { context: undefined },
        'hello world',
      );
    });
  });

  describe('warn()', () => {
    it('forwards to pino.warn with context', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);

      logger.warn('careful', 'WarnCtx');

      expect(pino.warn).toHaveBeenCalledWith({ context: 'WarnCtx' }, 'careful');
    });
  });

  describe('debug()', () => {
    it('forwards to pino.debug with context', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);

      logger.debug('details', 'DebugCtx');

      expect(pino.debug).toHaveBeenCalledWith({ context: 'DebugCtx' }, 'details');
    });
  });

  describe('verbose()', () => {
    it('forwards to pino.trace with context (pino has no verbose; trace is the rough equivalent)', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);

      logger.verbose('chatty', 'VerboseCtx');

      expect(pino.trace).toHaveBeenCalledWith({ context: 'VerboseCtx' }, 'chatty');
    });
  });

  describe('fatal()', () => {
    it('forwards to pino.fatal with context', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);

      logger.fatal('the end', 'FatalCtx');

      expect(pino.fatal).toHaveBeenCalledWith({ context: 'FatalCtx' }, 'the end');
    });
  });

  describe('error()', () => {
    it('forwards (message, stack, context) shape from Nest exception filter', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);
      const stack =
        'BadRequestException: bad input\n    at studentSignIn (auth.controller.ts:42:11)\n    at next (router.js:1:1)';

      logger.error('bad input', stack, 'ExceptionsHandler');

      expect(pino.error).toHaveBeenCalledTimes(1);
      expect(pino.error).toHaveBeenCalledWith(
        { context: 'ExceptionsHandler', stack },
        'bad input',
      );
    });

    it('forwards (Error) shape, putting the error under "err" for pino default serializer', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);
      const err = new Error('boom');

      logger.error(err);

      expect(pino.error).toHaveBeenCalledTimes(1);
      expect(pino.error).toHaveBeenCalledWith(
        { err, context: undefined },
        'boom',
      );
    });

    it('forwards (Error, undefined, context) shape — caller passed Error plus context', () => {
      const pino = makePino();
      const logger = new PinoLoggerService(pino as any);
      const err = new Error('explode');

      logger.error(err, undefined, 'MyService');

      expect(pino.error).toHaveBeenCalledWith(
        { err, context: 'MyService' },
        'explode',
      );
    });
  });

  describe('defensive fallback', () => {
    let writeSpy: jest.SpyInstance;

    beforeEach(() => {
      writeSpy = jest
        .spyOn(process.stdout, 'write')
        .mockImplementation(() => true);
    });

    afterEach(() => {
      writeSpy.mockRestore();
    });

    it('falls back to process.stdout.write(JSON) when pino throws', () => {
      const pino = makePino();
      pino.info.mockImplementation(() => {
        throw new Error('pino-broken');
      });
      const logger = new PinoLoggerService(pino as any);

      // Should not throw.
      expect(() => logger.log('hello', 'Ctx')).not.toThrow();

      expect(writeSpy).toHaveBeenCalledTimes(1);
      const written = (writeSpy.mock.calls[0]?.[0] as string) ?? '';
      const parsed = JSON.parse(written.trimEnd());
      expect(parsed).toMatchObject({
        level: 'info',
        msg: 'hello',
        context: 'Ctx',
        bridge_error: 'pino-broken',
      });
    });

    it('falls back when pino.error throws', () => {
      const pino = makePino();
      pino.error.mockImplementation(() => {
        throw new Error('pino-error-broken');
      });
      const logger = new PinoLoggerService(pino as any);

      expect(() => logger.error('bad', 'stack', 'Ctx')).not.toThrow();

      expect(writeSpy).toHaveBeenCalledTimes(1);
      const written = (writeSpy.mock.calls[0]?.[0] as string) ?? '';
      const parsed = JSON.parse(written.trimEnd());
      expect(parsed).toMatchObject({
        level: 'error',
        msg: 'bad',
        context: 'Ctx',
        stack: 'stack',
        bridge_error: 'pino-error-broken',
      });
    });
  });
});
