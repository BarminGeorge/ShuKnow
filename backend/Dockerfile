FROM mcr.microsoft.com/dotnet/sdk:8.0 AS restore
WORKDIR /src

COPY backend/ShuKnow.sln ./backend/

COPY backend/ShuKnow.Host/ShuKnow.Host.csproj ./backend/ShuKnow.Host/
COPY backend/ShuKnow.Application/ShuKnow.Application.csproj ./backend/ShuKnow.Application/
COPY backend/ShuKnow.Domain/ShuKnow.Domain.csproj ./backend/ShuKnow.Domain/
COPY backend/ShuKnow.Infrastructure/ShuKnow.Infrastructure.csproj ./backend/ShuKnow.Infrastructure/
COPY backend/ShuKnow.Metrics/ShuKnow.Metrics.csproj ./backend/ShuKnow.Metrics/
COPY backend/ShuKnow.WebAPI/ShuKnow.WebAPI.csproj ./backend/ShuKnow.WebAPI/

RUN dotnet restore backend/ShuKnow.Host/ShuKnow.Host.csproj

FROM restore AS publish
COPY backend/. ./backend/
RUN dotnet publish backend/ShuKnow.Host/ShuKnow.Host.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 8080

COPY --from=publish /app/publish ./

USER $APP_UID
ENTRYPOINT ["dotnet", "ShuKnow.Host.dll"]
