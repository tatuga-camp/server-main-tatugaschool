export type RequestCreateCustomer = {
  email: string;
  schoolTitle: string;
  description: string;
};

export type RequestUpdateCustomer = {
  query: {
    stripeCustomerId: string;
  };
  body: {
    email?: string;
    name?: string;
  };
};
