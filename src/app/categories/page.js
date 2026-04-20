import AppShell from '@/components/AppShell';
import { getCategories } from '@/app/actions';
import CategoryManager from './CategoryManager';

export const metadata = {
  title: 'Categories | MyPomo',
};

export default async function CategoriesPage() {
  const categories = await getCategories();

  return (
    <AppShell>
      <CategoryManager categories={categories} />
    </AppShell>
  );
}
