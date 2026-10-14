import { legalRoute } from '@/components/legal/legalRoute';
import { routes } from '@/lib/routes';

const route = legalRoute('ranking', routes.ranking);

export const generateMetadata = route.generateMetadata;
export default route.Page;
