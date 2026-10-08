import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import AppCarousel from '../components/AppCarousel.vue';
import vuetify from '../plugins/vuetify.js';

describe('AppCarousel Component', () => {
  const sampleApps = [
    { id: 'netflix', name: 'Netflix', appId: 'netflix', nameSpace: 2, color: '#E50914' },
    { id: 'youtube', name: 'YouTube', appId: 'youtube', nameSpace: 2, color: '#FF0000' }
  ];

  it('renders app cards and emits launch on click', async () => {
    const wrapper = mount(AppCarousel, {
      props: {
        apps: sampleApps
      },
      global: {
        plugins: [vuetify]
      }
    });

    const cards = wrapper.findAll('.app-card');
    expect(cards.length).toBe(2);

    await cards[0].trigger('click');
    expect(wrapper.emitted('launch')?.[0]).toEqual([sampleApps[0]]);

    await cards[1].trigger('click');
    expect(wrapper.emitted('launch')?.[1]).toEqual([sampleApps[1]]);
  });
});
