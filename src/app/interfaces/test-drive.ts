export interface TestDriveRequest {
  carId: number;
  carLabel: string;
  fullName: string;
  phone: string;
  email: string;

  date: string;

  slot: string;
}

export interface TestDriveReservation extends TestDriveRequest {
  reference: string;
  createdAt: string;
}
