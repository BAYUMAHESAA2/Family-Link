import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../users/user.entity';

@Entity()
export class Location {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('double precision')
  latitude: number;

  @Column('double precision')
  longitude: number;

  @Column({ nullable: true })
  accuracy: number;

  @ManyToOne(() => User, (user) => user.locations)
  user: User;

  @Column()
  userId: string;

  @CreateDateColumn()
  createdAt: Date;
}