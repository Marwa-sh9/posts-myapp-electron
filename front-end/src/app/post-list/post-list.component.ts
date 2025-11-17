import { Component, OnInit, OnDestroy } from '@angular/core'; // ✅ إضافة OnDestroy
import { ElectronService } from '../electron.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule, Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject } from 'rxjs'; 
import { takeUntil } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-post-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatChipsModule,
    MatToolbarModule,
    RouterModule,
    MatTooltipModule
  ],
  templateUrl: './post-list.component.html',
  styleUrls: ['./post-list.component.scss']
})
export class PostListComponent implements OnInit, OnDestroy {
  posts: any[] = [];
  searchResults: any[] = [];
  searchKeyword: string = '';
  selectedPost: any = null;

  // ✅ خاصية لإيقاف الاشتراكات بشكل نظيف
  private destroy$ = new Subject<void>();

  constructor(
    private electronService: ElectronService,
    private router: Router,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadPosts();
    this.listenForRefresh(); 
  }

  // ✅ إضافة OnDestroy لإيقاف الاشتراك وتجنب تسرب الذاكرة
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ✅ الدالة الجديدة للاستماع لإشارة التحديث من Electron
  private listenForRefresh(): void {
    this.electronService.postRefresh$
      .pipe(takeUntil(this.destroy$)) // إيقاف الاشتراك عند تدمير المكون
      .subscribe(() => {
        console.log('PostListComponent: تلقي إشارة التحديث التلقائي. إعادة تحميل المنشورات...');
        this.loadPosts(); // إعادة جلب المنشورات لتحديث القائمة
      });
  }

  loadPosts(): void {
    this.electronService.getAllPosts()
      .then((results: any) => {
        this.posts = results as any[];
        // في حالة وجود بحث، نقوم بتحديث نتائج البحث أيضاً
        if (this.searchKeyword.trim()) {
          this.searchPosts();
        } else {
          // إذا لم يكن هناك بحث، نعرض كل المنشورات
          this.searchResults = results as any[];
        }
      })
      .catch((error) => {
        console.error('خطأ في تحميل المنشورات:', error);
      });
  }

  searchPosts(): void {
    if (this.searchKeyword.trim()) {
      this.electronService.searchPosts(this.searchKeyword)
        .then((results: any) => {
          this.searchResults = results as any[];
        })
        .catch((error) => {
          console.error('خطأ في البحث:', error);
        });
    } else {
      this.searchResults = this.posts;
    }
  }

  selectPost(post: any): void {
    this.selectedPost = { ...post };
  }
  title: string = '';
  text: string = '';
  tags: string = '';
newPost(): void {
    // 1. تحقق مما إذا كان هناك منشور محدد حاليًا
    if (this.selectedPost) {
      // 2. طلب التأكيد من المستخدم للتخلص من التعديلات غير المحفوظة
      if (!confirm(' هل أنت متأكد من أنك تريد البدء بمنشور جديد والتخلص من التعديلات الحالية؟')) {
        return; // إذا ضغط المستخدم على "إلغاء"، نتوقف
      }
    }

    // 3. إعادة تعيين الحقول لبدء منشور جديد
    this.selectedPost = null; // إزالة المنشور المحدد لإظهار واجهة "منشور جديد"
    this.title = ''; // حقل العنوان للمنشور الجديد (إذا كنت تستخدم حقول منفصلة لـ newPost)
    this.text = ''; // حقل النص
    this.tags = ''; // حقل الوسوم
    console.log('تم إلغاء اختيار المنشور الحالي. جاهز لإنشاء منشور جديد.');
  }

  async addPostAction(): Promise<void> {
    try {
      if (!this.text.trim()) {
        this.showErrorDialog('يرجى كتابة نص المنشور!');
        return;
      }

      console.log('محاولة إضافة منشور:', { title: this.title, text: this.text, tags: this.tags });
      const result = await this.electronService.addPost(this.title, this.text, this.tags);
      console.log('نتيجة إضافة المنشور:', result);

      this.showErrorDialog('تمت إضافة المنشور بنجاح!');
      this.title = '';
      this.text = '';
      this.tags = '';

      this.loadPosts();
    }
    catch (error) {
      console.error('فشل إضافة المنشور:', error);
      this.showErrorDialog('فشل إضافة المنشور، يرجى المحاولة مرة أخرى.');
    }
  }
  savePost(): void {
    const trimmedTitle = this.selectedPost.title ? this.selectedPost.title.trim() : '';
    const trimmedText = this.selectedPost.text ? this.selectedPost.text.trim() : '';
    const safeTags = this.selectedPost.tags ? this.selectedPost.tags.trim() : '';

    if (!trimmedText) {
      this.showErrorDialog('لا يمكن أن يكون نص المنشور فارغًا. الرجاء إدخال نص.');
      return; // إيقاف العملية
    }

    if (confirm('هل أنت متأكد أنك تريد حفظ هذه التعديلات؟')) {
      this.electronService.editPost(this.selectedPost.id, trimmedTitle, trimmedText, safeTags)
        .then((result: any) => {
          if (result.success) {
            this.showErrorDialog('تم حفظ التعديلات بنجاح!');

            this.selectedPost.title = trimmedTitle;
            this.selectedPost.text = trimmedText;
            this.selectedPost.tags = safeTags;

          } else if (result.error) {
            console.error('فشل الحفظ:', result.error);
            this.showErrorDialog(`فشل الحفظ: ${result.error}`);
          }
        })
        .catch((error) => {
          console.error('خطأ في حفظ التعديلات:', error);
        });
    } else {
      console.log('تم إلغاء حفظ التعديلات.');
    }
  }

  deletePost(id: number): void {
    // استخدام دالة التأكيد المدمجة في المتصفح
    if (confirm(' هل أنت متأكد أنك تريد حذف هذا المنشور ؟ اذا حذفتووو لح تكون في خطرر هااا كهكه')) {

      // 1. استدعاء خدمة الحذف
      this.electronService.deletePost(id)
        .then((result: any) => {
          if (result.success) {
            if (this.selectedPost && this.selectedPost.id === id) {
              this.selectedPost = null; 
            }
            this.showErrorDialog('تم حذف المنشور بنجاح!');

          } else if (result.error) {
            console.error('فشل الحذف:', result.error);
            this.showErrorDialog(`فشل الحذف: ${result.error}`);
          }
        })
        .catch((error) => {
          console.error('خطأ في حذف المنشور:', error);
          this.showErrorDialog('حدث خطأ غير متوقع أثناء الحذف.');
        });
    } else {
      console.log('تم إلغاء عملية الحذف.');
    }
  }

  private showSuccessDialog(message: string): void {
  // استخدم MatDialog أو مكتبة مثل SweetAlert2 هنا
  console.log('نجاح:', message);
}

private showErrorDialog(message: string): void {
  // استخدم MatDialog أو مكتبة مثل SweetAlert2 هنا
  console.error('خطأ:', message);
}
}