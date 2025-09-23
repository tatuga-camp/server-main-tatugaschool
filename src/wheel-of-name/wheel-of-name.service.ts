import { WheelOfNameRepository } from './wheel-of-name.repository';
import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseCreate, ResponseGet, ResponseUpdate } from './interfaces';

@Injectable()
export class WheelOfNameService {
  private logger: Logger = new Logger(WheelOfNameService.name);
  private wheelOfNameRepository: WheelOfNameRepository;
  constructor(
    private httpService: HttpService,
    private config: ConfigService,
  ) {
    this.wheelOfNameRepository = new WheelOfNameRepository(
      this.httpService,
      this.config,
    );
  }

  async get(dto: { path: string }): Promise<ResponseGet> {
    try {
      const wheel = await this.wheelOfNameRepository.get({
        where: {
          path: dto.path,
        },
      });
      return wheel;
    } catch (error) {
      throw error;
    }
  }

  async create(
    dto: { texts: { text: string }[] } & { title: string; description: string },
  ): Promise<ResponseCreate> {
    try {
      const wheel = await this.wheelOfNameRepository.create({
        wheelConfig: {
          displayWinnerDialog: true,
          slowSpin: false,
          pageBackgroundColor: '#FFFFFF',
          animateWinner: false,
          winnerMessage: "Congratulations! You're the the one!",
          title: dto.title,
          description: dto.description,
          type: 'color',
          autoRemoveWinner: false,
          playClickWhenWinnerRemoved: false,
          maxNames: 1000,
          afterSpinSoundVolume: 50,
          spinTime: 10,
          hubSize: 'S',
          entries: dto.texts,
          isAdvanced: false,
          colorSettings: [
            {
              color: '#6149CD',
              enabled: true,
            },
            {
              color: '#27AE60',
              enabled: true,
            },
            {
              color: '#FFCD1B',
              enabled: true,
            },
            {
              color: '#F7F8FA',
              enabled: true,
            },
          ],
          showTitle: true,
          displayHideButton: true,
          duringSpinSoundVolume: 50,
          displayRemoveButton: true,
          allowDuplicates: true,
          drawOutlines: false,
          launchConfetti: true,
          drawShadow: true,
        },
        shareMode: 'copyable',
      });
      return wheel;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }

  async update(dto: {
    path: string;
    texts: { text: string }[];
    title: string;
    description: string;
  }): Promise<ResponseUpdate> {
    try {
      const wheel = await this.wheelOfNameRepository.update({
        where: {
          path: dto.path,
        },
        data: {
          wheelConfig: {
            entries: dto.texts,
            title: dto.title,
            description: dto.description,
          },
        },
      });
      return wheel;
    } catch (error) {
      this.logger.error(error);
      throw error;
    }
  }
}
