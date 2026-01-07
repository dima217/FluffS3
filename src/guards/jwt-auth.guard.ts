import { Injectable, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Allow Swagger endpoints without authentication
    const request = context.switchToHttp().getRequest();
    const path = request.url?.split("?")[0] || request.path;
    if (
      path &&
      (path === "/api" ||
        path.startsWith("/api/") ||
        path.startsWith("/api-json") ||
        path.startsWith("/api-yaml"))
    ) {
      return true;
    }

    return super.canActivate(context);
  }
}
