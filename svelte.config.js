import adapter from '@sveltejs/adapter-auto';
import { sveltekit } from '@sveltejs/kit/vite';

export default {
  kit: {
    adapter: adapter()
  }
};
