import { Routes } from '@angular/router';
import { PostListComponent } from './post-list/post-list.component';

export const routes: Routes = [
  { path: '', redirectTo: '/list', pathMatch: 'full' },
  { path: 'list', component: PostListComponent },
];
