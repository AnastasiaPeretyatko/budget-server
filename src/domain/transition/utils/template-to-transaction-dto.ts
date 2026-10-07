import { TemplateEntity } from 'src/domain/templates/template.entity';
import { CreateTransitionDto } from '../dto';

export function templateToTransactionDto(
  template: TemplateEntity,
  overrides: Partial<CreateTransitionDto>,
): CreateTransitionDto {
  const date = overrides.date || new Date();

  return {
    amount: template.amount,
    categoryId: template.categoryId,
    description: template.description,
    fromAccountId: template.fromAccountId,
    toAccountId: template.toAccountId,
    type: template.type,
    date,
    // Теги шаблона переходят в транзакцию (overrides.tagIds их заменяет)
    tagIds: template.tags?.length ? template.tags.map((tag) => tag.id) : null,
    ...overrides,
  };
}
