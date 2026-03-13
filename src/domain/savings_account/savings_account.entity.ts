import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('savings_account')
export class SavingAccountEntity {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', nullable: true })
  description?: string;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: false,
    default: '0',
  })
  amount: string;
}
