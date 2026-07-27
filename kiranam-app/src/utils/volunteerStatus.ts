import { VolunteerMember } from '@/context/AppContext';

export function statusMeta(status: VolunteerMember['status']) {
  switch (status) {
    case 'active':
      return { label: 'Active', bg: '#EAF7EF', text: '#22A559' };
    case 'due':
      return { label: 'Due', bg: '#FEF3E0', text: '#B8860B' };
    case 'overdue':
      return { label: 'Overdue', bg: '#FDECEC', text: '#EC2028' };
    case 'inactive':
    default:
      return { label: 'Inactive', bg: '#F1EEEA', text: '#7A756E' };
  }
}
