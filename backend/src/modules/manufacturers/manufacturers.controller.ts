import { Request, Response, NextFunction } from "express";
import { manufacturersService } from "./manufacturers.service.js";

export class ManufacturersController {
  async getManufacturers(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await manufacturersService.listManufacturers();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async createManufacturer(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, country, contactEmail, phone } = req.body;
      if (!name) {
        res.status(400).json({ success: false, error: "Manufacturer name is required" });
        return;
      }
      const data = await manufacturersService.createManufacturer({ name, country, contactEmail, phone });
      res.status(201).json({ success: true, data, message: "Manufacturer created successfully" });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateManufacturer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await manufacturersService.updateManufacturer(id as string, req.body);
      res.status(200).json({ success: true, data });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteManufacturer(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const data = await manufacturersService.deleteManufacturer(id as string);
      res.status(200).json(data);
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  }
}

export const manufacturersController = new ManufacturersController();
