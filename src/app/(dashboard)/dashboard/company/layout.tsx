export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="-m-6 h-[calc(100%+3rem)] min-h-0 flex flex-col">{children}</div>;
}
