import { DataServiceBase } from "./_data.base.service";
import { SHEET } from "./sheets";

export abstract class DeleteServices extends DataServiceBase {
    async deleteNotesBatch(noteIds: string[]): Promise<void> {
        this.cache.deleteNotesBatch(noteIds);
        const rows = await Promise.all(
            noteIds.map(id => this.sheets.findRowById(SHEET.notes, id))
        );
        noteIds
            .map((id, i) => ({ id, row: rows[i] }))
            .filter(x => x.row !== -1)
            .sort((a, b) => b.row - a.row)
            .forEach(x => this.queue.enqueue(
                { sheetName: SHEET.notes, rowIndex: x.row - 1 },
                'deleteRow'
            ));
    }

    deleteUser(id: string): void {
        this.cache.removeUser(id);
        this.sheets.findRowById(SHEET.users, id).then(row => {
            if (row === -1) return;
            this.queue.enqueue({ sheetName: SHEET.users, rowIndex: row - 1 }, 'deleteRow');
        });
    }

      async deleteFamille(id: string): Promise<void> {
        this.cache.removeFamille(id);
        const row = await this.sheets.findRowById(SHEET.familles, id);
        if (row === -1) return;
        this.queue.enqueue({ sheetName: SHEET.familles, rowIndex: row - 1 }, 'deleteRow');
      }
    
}