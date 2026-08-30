type AgriOfficer = {
  id: string;
  name: string;
  phone: string;
  district: string;
  state: string;
};

const agriOfficers: AgriOfficer[] = [
  {
    id: "officer-001",
    name: "Ramesh Kumar",
    phone: "9876543210",
    district: "Balasore",
    state: "Odisha",
  },
  {
    id: "officer-002",
    name: "Sanjay Das",
    phone: "9876543211",
    district: "Khordha",
    state: "Odisha",
  },
  {
    id: "officer-003",
    name: "Priya Sharma",
    phone: "9876543212",
    district: "Cuttack",
    state: "Odisha",
  },
];

export const findAgriOfficer = (district: string, state: string) => {
  return agriOfficers.find(
    (officer) =>
      officer.district.toLowerCase() === district.toLowerCase() &&
      officer.state.toLowerCase() === state.toLowerCase(),
  );
};