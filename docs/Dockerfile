FROM klakegg/hugo:ext-alpine AS build

WORKDIR /src

COPY ./docs .

RUN hugo --minify --gc

FROM nginx:alpine

COPY --from=build /src/public /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]