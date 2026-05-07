import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';

/**
 * Functional HTTP Interceptor para Angular 18 Standalone Apps
 * Agrega el token JWT al header Authorization de todas las requests
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // Clonar request y agregar Authorization header si existe token
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
    console.log('✅ Token agregado al header - URL:', req.url);
  } else {
    console.warn('⚠️ Sin token en localStorage');
  }

  return next(req).pipe(
    catchError((error: any) => {
      if (error.status === 401) {
        console.error('❌ 401 Unauthorized');
        console.error('URL:', req.url);
        console.error('Token presente:', !!token);
      }
      return throwError(() => error);
    }),
  );
};
