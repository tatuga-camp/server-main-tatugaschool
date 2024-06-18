export type RequestCreateCustomer = {
  email: string;
  name: string;
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
