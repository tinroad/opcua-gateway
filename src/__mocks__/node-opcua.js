const mockSession = {
  read: jest.fn(),
  write: jest.fn(),
  close: jest.fn().mockResolvedValue()
};

const mockClient = {
  connect: jest.fn().mockResolvedValue(),
  disconnect: jest.fn().mockResolvedValue(),
  createSession: jest.fn().mockResolvedValue(mockSession),
  on: jest.fn()
};

const OPCUAClient = {
  create: jest.fn().mockReturnValue(mockClient)
};

const DataType = {
  Boolean: 'Boolean',
  Int16: 'Int16',
  UInt16: 'UInt16',
  Int32: 'Int32',
  UInt32: 'UInt32',
  Float: 'Float',
  Double: 'Double',
  String: 'String',
  Variant: 'Variant'
};

const AttributeIds = {
  Value: 13
};

module.exports = {
  OPCUAClient,
  DataType,
  AttributeIds,
  mockClient,
  mockSession
}; 