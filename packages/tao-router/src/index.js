import router from './Router';
import { routeTag as route } from './routeTag';

export { route };

export default function init(...args) {
  new router(...args);
}
