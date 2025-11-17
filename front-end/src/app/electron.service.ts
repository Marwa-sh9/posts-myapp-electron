import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ElectronService {
  private ipcRenderer: any;

  public postRefresh$ = new Subject<void>();

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId) && window && (window as any).electronAPI) {
      this.ipcRenderer = (window as any).electronAPI;
      console.log('ipcRenderer متاح:', !!this.ipcRenderer);

      this.listenForPostRefresh();

    } else {
      console.warn('Electron غير متاح.');
    }
  }

  private listenForPostRefresh(): void {
    if (this.ipcRenderer) {
      this.ipcRenderer.on('refresh-posts', () => {
        console.log('ElectronService: تم استلام إشارة تحديث. إصدار حدث postRefresh$.');

        this.postRefresh$.next();
      });
    }
  }

  addPost(title: string, text: string, tags: string) {
    return new Promise((resolve, reject) => {
      if (!this.ipcRenderer) {
        console.error('ipcRenderer غير متاح!');
        reject('Electron IPC غير متاح');
        return;
      }
      this.ipcRenderer.send('add-post', { title, text, tags });
      this.ipcRenderer.once('post-added', (result: any) => {
        console.log('رد من Electron:', result);
        resolve(result);
      });
    });
  }

  editPost(id: number, title: string, text: string, tags: string) {
    return new Promise((resolve, reject) => {
      if (!this.ipcRenderer) {
        reject('Electron IPC غير متاح');
        return;
      }
      this.ipcRenderer.send('edit-post', {id, title, text, tags});
      this.ipcRenderer.once('post-edited', (result: any) => {
        resolve(result);
      });
    });
  }

  searchPosts(keyword: string) {
    return new Promise<any>((resolve, reject) => {
      if (!this.ipcRenderer) {
        reject('Electron IPC غير متاح');
        return;
      }
      this.ipcRenderer.send('search-posts', keyword);
      this.ipcRenderer.once('search-results', (results: any) => {
        resolve(results);
      });
    });
  }

  getAllPosts() {
    return new Promise<any>((resolve, reject) => {
      if (!this.ipcRenderer) {
        reject('Electron IPC غير متاح');
        return;
      }
      this.ipcRenderer.send('get-all-posts');
      this.ipcRenderer.once('all-posts', (results: any) => {
        resolve(results);
      });
    });
  }

  getPost(id: number) {
    return new Promise((resolve, reject) => {
      if (!this.ipcRenderer) {
        reject('Electron IPC غير متاح');
        return;
      }
      this.ipcRenderer.send('get-post', id);
      this.ipcRenderer.once('post-data', (result: any) => {
        resolve(result);
      });
    });
  }

  deletePost(id: number) {
    return new Promise((resolve, reject) => {
      if (!this.ipcRenderer) {
        reject('Electron IPC غير متاح');
        return;
      }
      this.ipcRenderer.send('delete-post', id);
      this.ipcRenderer.once('post-deleted', (result: any) => {
        resolve(result);
      });
    });
  }
}