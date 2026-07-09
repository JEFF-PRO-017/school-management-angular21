import { inject } from "@angular/core";
import { CacheService } from "../cache.service";
import { GoogleSheetsService } from "../@google-sheets/google-sheets.service";
import { SheetsQueueServiceService } from "../sheets-queue.service";

// data-service.base.ts
export abstract class DataServiceBase {
    protected cache = inject(CacheService);
    protected queue = inject(SheetsQueueServiceService);
    protected sheets = inject(GoogleSheetsService);
}   