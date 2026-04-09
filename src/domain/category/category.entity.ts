import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('category')
export class CategoryEntity {
  @PrimaryColumn()
  id!: string;

  @Column({ type: 'varchar', nullable: false })
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  description!: string;
}
