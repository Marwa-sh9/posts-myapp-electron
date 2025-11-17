import { Component } from '@angular/core';
import { RouterOutlet, RouterModule , RouterLink, RouterLinkActive  } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { PostListComponent } from './post-list/post-list.component';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    MatToolbarModule,
    PostListComponent,
    MatButtonModule
  ],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'posts-myapp';
}
