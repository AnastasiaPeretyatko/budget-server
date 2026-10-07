import '../../tags/tag.entity';
import type { TemplateEntity } from '../../templates/template.entity';
import { templateToTransactionDto } from './template-to-transaction-dto';

const template = (tags: Array<{ id: string }>) =>
  ({
    amount: '250.00',
    categoryId: 'cat-1',
    description: null,
    fromAccountId: 'acc-1',
    toAccountId: null,
    type: 'expense',
    tags,
  }) as unknown as TemplateEntity;

describe('templateToTransactionDto', () => {
  it('теги шаблона переходят в транзакцию', () => {
    const dto = templateToTransactionDto(
      template([{ id: 't1' }, { id: 't2' }]),
      {},
    );

    expect(dto.tagIds).toEqual(['t1', 't2']);
    expect(dto).toMatchObject({ amount: '250.00', categoryId: 'cat-1' });
  });

  it('у шаблона нет тегов — null', () => {
    expect(templateToTransactionDto(template([]), {}).tagIds).toBeNull();
  });

  it('overrides.tagIds заменяет теги шаблона', () => {
    expect(
      templateToTransactionDto(template([{ id: 't1' }]), { tagIds: ['x'] })
        .tagIds,
    ).toEqual(['x']);
  });
});
