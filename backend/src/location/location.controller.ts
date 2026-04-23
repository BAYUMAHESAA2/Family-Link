import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LocationService } from './location.service';

@Controller('location')
export class LocationController {
  constructor(private locationService: LocationService) {}

  // Jamaah kirim lokasi (dari location screen)
  @Post()
  @UseGuards(AuthGuard('jwt'))
  sendLocation(
    @Request() req,
    @Body() body: { latitude: number; longitude: number; accuracy?: number },
  ) {
    return this.locationService.saveLocation(
      req.user.userId,
      body.latitude,
      body.longitude,
      body.accuracy,
    );
  }

  // Keluarga lihat lokasi terbaru
  @Get(':userId')
  @UseGuards(AuthGuard('jwt'))
  getLatest(@Param('userId') userId: string) {
    return this.locationService.getLatestLocation(userId);
  }

  // Riwayat lokasi
  @Get(':userId/history')
  @UseGuards(AuthGuard('jwt'))
  getHistory(@Param('userId') userId: string) {
    return this.locationService.getLocationHistory(userId);
  }
}