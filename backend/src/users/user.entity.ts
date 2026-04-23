// backend/src/users/user.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Location } from '../location/location.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  jamaahCode: string; // kode unik jamaah

  @OneToMany(() => Location, (loc) => loc.user)
  locations: Location[];
}
