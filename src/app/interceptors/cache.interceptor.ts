import { Injectable } from '@angular/core';
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpResponse
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry {
  expiresAt: number;
  response: HttpResponse<any>;
}

@Injectable()
export class CacheInterceptor implements HttpInterceptor {
  private readonly ttlMs = 20_000;
  private readonly cache = new Map<string, CacheEntry>();

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Keep write operations fresh by invalidating cache.
    if (req.method !== 'GET') {
      this.cache.clear();
      return next.handle(req);
    }

    // Skip auth and explicit no-cache calls.
    if (req.url.includes('/auth/') || req.headers.has('x-no-cache')) {
      return next.handle(req);
    }

    const key = req.urlWithParams;
    const now = Date.now();
    const hit = this.cache.get(key);
    if (hit && hit.expiresAt > now) {
      return of(hit.response.clone());
    }

    return next.handle(req).pipe(
      tap((event) => {
        if (event instanceof HttpResponse) {
          this.cache.set(key, {
            expiresAt: now + this.ttlMs,
            response: event.clone()
          });
        }
      })
    );
  }
}

