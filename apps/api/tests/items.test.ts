import mongoose from 'mongoose';
import { SalesController } from '../src/controllers/sales.controller';
import { Product } from '../src/models/Product';
import { InventoryMovement } from '../src/models/InventoryMovement';
import { toDecimal } from '../src/utils/decimal';

describe('Items & Products Module - Create, Save, Display & KPI Integration', () => {
  const dummyEntityId = new mongoose.Types.ObjectId();
  const dummySalesAccountId = new mongoose.Types.ObjectId();
  const dummyCogsAccountId = new mongoose.Types.ObjectId();
  const dummyInvAccountId = new mongoose.Types.ObjectId();

  const mockResponse = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  const mockNext = jest.fn((err) => {
    if (err) console.error('Unexpected error in mockNext:', err);
  });

  const createMockQuery = (result: any) => ({
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: (resolve: any) => resolve(result),
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe('createItem', () => {
    it('should successfully create a physical Product with inventory tracking and opening stock', async () => {
      const req: any = {
        body: {
          entity_id: dummyEntityId.toString(),
          name: 'Industrial Widget X1',
          sku: 'WID-001',
          product_type: 'PRODUCT',
          category: 'Hardware',
          unit: 'PCS',
          selling_price: 1500,
          purchase_price: 900,
          tax_rate: 18,
          sales_account_id: dummySalesAccountId.toString(),
          purchase_account_id: dummyCogsAccountId.toString(),
          inventory_account_id: dummyInvAccountId.toString(),
          track_inventory: true,
          opening_stock: 50,
          opening_stock_rate: 900,
          reorder_level: 10,
          warehouse_location: 'Rack A1',
          description: 'High performance industrial widget'
        },
        currentEntityId: dummyEntityId,
        user: { id: new mongoose.Types.ObjectId() }
      };

      const res = mockResponse();

      // Mock SKU duplicate check -> not found
      jest.spyOn(Product, 'findOne').mockResolvedValueOnce(null);

      const savedDoc: any = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntityId,
        name: 'Industrial Widget X1',
        sku: 'WID-001',
        product_type: 'PRODUCT',
        category: 'Hardware',
        unit: 'PCS',
        description: 'High performance industrial widget',
        selling_price: toDecimal(1500),
        purchase_price: toDecimal(900),
        tax_rate: toDecimal(18),
        income_account_id: dummySalesAccountId,
        expense_account_id: dummyCogsAccountId,
        sales_account_id: { _id: dummySalesAccountId, code: '4000', name: 'Sales Revenue' },
        cogs_account_id: { _id: dummyCogsAccountId, code: '5000', name: 'Cost of Goods Sold' },
        inventory_account_id: { _id: dummyInvAccountId, code: '1300', name: 'Inventory Asset' },
        track_inventory: true,
        current_stock: toDecimal(50),
        opening_stock: toDecimal(50),
        opening_stock_rate: toDecimal(900),
        reorder_level: toDecimal(10),
        warehouse_location: 'Rack A1',
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(Product, 'create').mockResolvedValueOnce(savedDoc as any);
      jest.spyOn(Product, 'findById').mockReturnValue(createMockQuery(savedDoc) as any);
      const invMoveSpy = jest.spyOn(InventoryMovement, 'create').mockResolvedValueOnce({} as any);

      await SalesController.createItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalled();
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.name).toBe('Industrial Widget X1');
      expect(responseBody.data.sku).toBe('WID-001');
      expect(responseBody.data.selling_price).toBe(1500);
      expect(responseBody.data.purchase_price).toBe(900);
      expect(responseBody.data.current_stock).toBe(50);
      expect(responseBody.data.track_inventory).toBe(true);

      // Verify opening stock inventory movement was recorded
      expect(invMoveSpy).toHaveBeenCalledWith(expect.objectContaining({
        entity_id: dummyEntityId,
        movement_type: 'ADJUSTMENT_IN',
        reference_type: 'OPENING_STOCK',
        quantity: toDecimal(50),
        unit_cost: toDecimal(900)
      }));
    });

    it('should create a Service with inventory tracking strictly disabled', async () => {
      const req: any = {
        body: {
          entity_id: dummyEntityId.toString(),
          name: 'IT Consulting Service',
          sku: 'SRV-CONSULT',
          product_type: 'SERVICE',
          category: 'Professional Services',
          unit: 'HRS',
          selling_price: 3500,
          purchase_price: 0,
          tax_rate: 18,
          track_inventory: true, // Should be overridden to false for SERVICE
          opening_stock: 100 // Should be forced to 0
        },
        currentEntityId: dummyEntityId,
        user: { id: new mongoose.Types.ObjectId() }
      };

      const res = mockResponse();

      jest.spyOn(Product, 'findOne').mockResolvedValueOnce(null);

      const savedDoc: any = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntityId,
        name: 'IT Consulting Service',
        sku: 'SRV-CONSULT',
        product_type: 'SERVICE',
        category: 'Professional Services',
        unit: 'HRS',
        selling_price: toDecimal(3500),
        purchase_price: toDecimal(0),
        tax_rate: toDecimal(18),
        track_inventory: false,
        current_stock: toDecimal(0),
        opening_stock: toDecimal(0),
        reorder_level: toDecimal(0),
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(Product, 'create').mockImplementationOnce(async (payload: any) => {
        expect(payload.track_inventory).toBe(false);
        expect(payload.opening_stock.toString()).toBe('0.00');
        expect(payload.current_stock.toString()).toBe('0.00');
        return savedDoc;
      });
      jest.spyOn(Product, 'findById').mockReturnValue(createMockQuery(savedDoc) as any);

      const invMoveSpy = jest.spyOn(InventoryMovement, 'create');

      await SalesController.createItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.data.product_type).toBe('SERVICE');
      expect(responseBody.data.track_inventory).toBe(false);
      expect(responseBody.data.current_stock).toBe(0);
      expect(invMoveSpy).not.toHaveBeenCalled();
    });

    it('should enforce SKU uniqueness and return 409 Conflict if SKU exists in entity', async () => {
      const req: any = {
        body: {
          entity_id: dummyEntityId.toString(),
          name: 'Duplicate Item',
          sku: 'DUP-001'
        },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      jest.spyOn(Product, 'findOne').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        sku: 'DUP-001'
      } as any);

      await SalesController.createItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        detail: "An item with SKU 'DUP-001' already exists for this organization."
      }));
    });

    it('should auto-generate a unique SKU if SKU is not provided', async () => {
      const req: any = {
        body: {
          entity_id: dummyEntityId.toString(),
          name: 'No SKU Item',
          product_type: 'PRODUCT'
        },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      jest.spyOn(Product, 'findOne').mockResolvedValueOnce(null);

      const savedDoc: any = {
        _id: new mongoose.Types.ObjectId(),
        entity_id: dummyEntityId,
        name: 'No SKU Item',
        sku: 'ITM-123456',
        product_type: 'PRODUCT',
        selling_price: toDecimal(0),
        purchase_price: toDecimal(0),
        tax_rate: toDecimal(18),
        track_inventory: true,
        current_stock: toDecimal(0),
        opening_stock: toDecimal(0),
        reorder_level: toDecimal(0),
        is_active: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest.spyOn(Product, 'create').mockImplementationOnce(async (payload: any) => {
        expect(payload.sku).toMatch(/^ITM-/);
        return { ...savedDoc, sku: payload.sku };
      });
      jest.spyOn(Product, 'findById').mockReturnValue(createMockQuery(savedDoc) as any);

      await SalesController.createItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(201);
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.data.sku).toBeDefined();
      expect(responseBody.data.sku).toMatch(/^ITM-/);
    });

    it('should reject creation if item name is missing', async () => {
      const req: any = {
        body: {
          entity_id: dummyEntityId.toString(),
          name: '   '
        },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      await SalesController.createItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        detail: 'Item Name is required'
      }));
    });
  });

  describe('listItems', () => {
    it('should return paginated items matching frontend expectations (both items and data arrays)', async () => {
      const req: any = {
        query: {
          entity_id: dummyEntityId.toString(),
          page: '1',
          page_size: '20',
          paginate: 'true'
        },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      const mockProducts = [
        {
          _id: new mongoose.Types.ObjectId(),
          entity_id: dummyEntityId,
          name: 'Widget A',
          sku: 'WID-A',
          product_type: 'PRODUCT',
          selling_price: toDecimal(100),
          purchase_price: toDecimal(60),
          tax_rate: toDecimal(18),
          current_stock: toDecimal(25),
          is_active: true
        },
        {
          _id: new mongoose.Types.ObjectId(),
          entity_id: dummyEntityId,
          name: 'Service B',
          sku: 'SRV-B',
          product_type: 'SERVICE',
          selling_price: toDecimal(500),
          purchase_price: toDecimal(0),
          tax_rate: toDecimal(18),
          current_stock: toDecimal(0),
          is_active: true
        }
      ];

      (jest.spyOn(Product, 'countDocuments') as any).mockResolvedValueOnce(2);
      jest.spyOn(Product, 'find').mockReturnValue(createMockQuery(mockProducts) as any);

      await SalesController.listItems(req, res, mockNext);

      expect(res.json).toHaveBeenCalled();
      const responseBody = res.json.mock.calls[0][0];

      expect(responseBody.success).toBe(true);
      expect(responseBody.total).toBe(2);
      expect(responseBody.page).toBe(1);
      expect(responseBody.page_size).toBe(20);
      expect(responseBody.total_pages).toBe(1);

      // Verify that both items and data are provided
      expect(Array.isArray(responseBody.items)).toBe(true);
      expect(Array.isArray(responseBody.data)).toBe(true);
      expect(responseBody.items.length).toBe(2);
      expect(responseBody.data.length).toBe(2);

      // Verify Decimal128 conversion to numbers
      expect(responseBody.items[0].selling_price).toBe(100);
      expect(responseBody.items[0].current_stock).toBe(25);
      expect(responseBody.items[1].selling_price).toBe(500);
      expect(responseBody.items[1].current_stock).toBe(0);
    });

    it('should correctly apply search and filter parameters', async () => {
      const req: any = {
        query: {
          entity_id: dummyEntityId.toString(),
          name_search: 'Widget',
          sku_search: 'WID',
          type: 'PRODUCT',
          status: 'ACTIVE',
          category: 'Tools'
        },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      (jest.spyOn(Product, 'countDocuments') as any).mockImplementationOnce(async (filter: any) => {
        expect(filter.name).toEqual({ $regex: 'Widget', $options: 'i' });
        expect(filter.sku).toEqual({ $regex: 'WID', $options: 'i' });
        expect(filter.product_type).toEqual({ $in: ['PRODUCT', 'GOODS'] });
        expect(filter.is_active).toBe(true);
        expect(filter.category).toBe('Tools');
        return 1;
      });

      jest.spyOn(Product, 'find').mockReturnValue(createMockQuery([]) as any);

      await SalesController.listItems(req, res, mockNext);

      expect(res.json).toHaveBeenCalled();
    });
  });

  describe('getItemsSummary', () => {
    it('should compute comprehensive and accurate KPI summary counts matching frontend cards', async () => {
      const req: any = {
        query: { entity_id: dummyEntityId.toString() },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      const mockProducts = [
        {
          _id: new mongoose.Types.ObjectId(),
          product_type: 'PRODUCT',
          is_active: true,
          track_inventory: true,
          current_stock: toDecimal(5),
          reorder_level: toDecimal(10) // Low stock!
        },
        {
          _id: new mongoose.Types.ObjectId(),
          product_type: 'PRODUCT',
          is_active: true,
          track_inventory: true,
          current_stock: toDecimal(50),
          reorder_level: toDecimal(10) // Normal stock
        },
        {
          _id: new mongoose.Types.ObjectId(),
          product_type: 'PRODUCT',
          is_active: false, // Inactive product
          track_inventory: false,
          current_stock: toDecimal(0),
          reorder_level: toDecimal(0)
        },
        {
          _id: new mongoose.Types.ObjectId(),
          product_type: 'SERVICE',
          is_active: true,
          track_inventory: false,
          current_stock: toDecimal(0),
          reorder_level: toDecimal(0)
        }
      ];

      jest.spyOn(Product, 'find').mockResolvedValueOnce(mockProducts as any);

      await SalesController.getItemsSummary(req, res, mockNext);

      expect(res.json).toHaveBeenCalled();
      const responseBody = res.json.mock.calls[0][0];

      expect(responseBody.success).toBe(true);
      expect(responseBody.total_items).toBe(4);
      expect(responseBody.products_count).toBe(3);
      expect(responseBody.services_count).toBe(1);
      expect(responseBody.active_items).toBe(3);
      expect(responseBody.inactive_items).toBe(1);
      expect(responseBody.inventory_tracked).toBe(2);
      expect(responseBody.low_stock_items).toBe(1);

      // Verify that data property also contains the same summary
      expect(responseBody.data.total_items).toBe(4);
      expect(responseBody.data.products_count).toBe(3);
      expect(responseBody.data.services_count).toBe(1);
      expect(responseBody.data.inventory_tracked).toBe(2);
      expect(responseBody.data.active_items).toBe(3);
      expect(responseBody.data.low_stock_items).toBe(1);
    });
  });

  describe('updateItem & patchItemStatus', () => {
    it('should update product attributes and reject duplicate SKU on edit', async () => {
      const productId = new mongoose.Types.ObjectId();
      const req: any = {
        params: { id: productId.toString() },
        body: {
          name: 'Updated Widget',
          sku: 'EXISTING-SKU'
        },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      const existingItem = {
        _id: productId,
        entity_id: dummyEntityId,
        sku: 'OLD-SKU'
      };

      jest.spyOn(Product, 'findById').mockResolvedValueOnce(existingItem as any);
      // Another product already has EXISTING-SKU
      jest.spyOn(Product, 'findOne').mockResolvedValueOnce({
        _id: new mongoose.Types.ObjectId(),
        sku: 'EXISTING-SKU'
      } as any);

      await SalesController.updateItem(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: false,
        detail: "An item with SKU 'EXISTING-SKU' already exists."
      }));
    });

    it('should toggle item active status', async () => {
      const productId = new mongoose.Types.ObjectId();
      const req: any = {
        params: { id: productId.toString() },
        body: { is_active: false },
        currentEntityId: dummyEntityId
      };

      const res = mockResponse();

      const mockProduct = {
        _id: productId,
        entity_id: dummyEntityId,
        name: 'Active Item',
        is_active: false
      };

      jest.spyOn(Product, 'findByIdAndUpdate').mockResolvedValueOnce(mockProduct as any);

      await SalesController.patchItemStatus(req, res, mockNext);

      expect(res.json).toHaveBeenCalled();
      const responseBody = res.json.mock.calls[0][0];
      expect(responseBody.success).toBe(true);
      expect(responseBody.data.is_active).toBe(false);
    });
  });
});
