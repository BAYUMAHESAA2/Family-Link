import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Location } from './location.entity';

@Injectable()
export class LocationService {
  constructor(@InjectRepository(Location) private repo: Repository<Location>) {}

  async saveLocation(userId: string, latitude: number, longitude: number, accuracy?: number) {
    const loc = this.repo.create({ userId, latitude, longitude, accuracy });
    return this.repo.save(loc);
  }

  async getLatestLocation(userId: string) {
    return this.repo.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLocationHistory(userId: string) {
    return this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}