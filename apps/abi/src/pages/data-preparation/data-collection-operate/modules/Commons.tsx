import { FIELD_TYPE_OPTIONS } from '@/constants/data-preparation';

const fieldTypeOptions = FIELD_TYPE_OPTIONS.map(({ children: fChildren, icon, label, value }) => ({
  children: fChildren,
  label: (
    <>
      <SvgIcon
        className="mr-2 inline-block"
        localIcon={icon}
      />
      <span>{label}</span>
    </>
  ),
  value
}));

export { fieldTypeOptions };
