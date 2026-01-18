
import { createApp, ref, defineComponent, onMounted, nextTick } from 'vue';

const App = defineComponent({
  setup() {
    const cityInput = ref('');
    const weather = ref<any>(null);
    const loading = ref(false);
    const error = ref<string | null>(null);

    // Инициализация иконок Lucide
    const initIcons = () => nextTick(() => (window as any).lucide?.createIcons());

    // Получение погоды по координатам
    const getWeather = async (lat: number, lon: number, name?: string, country?: string) => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m`);
        const data = await res.json();
        
        let cityName = name;
        let regionName = country;

        // Если имя города не передано (при GPS), определяем его через обратный геокодинг
        if (!name) {
          const rev = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=ru`);
          const revData = await rev.json();
          cityName = revData.address.city || revData.address.town || revData.address.village || "Местоположение";
          regionName = revData.address.country;
        }

        const codes: any = { 
          0: 'Ясно', 1: 'Преимущественно ясно', 2: 'Переменная облачность', 3: 'Пасмурно', 
          45: 'Туман', 48: 'Иней', 51: 'Морось', 61: 'Небольшой дождь', 71: 'Снегопад', 95: 'Гроза' 
        };

        weather.value = {
          city: cityName,
          region: regionName,
          temp: Math.round(data.current.temperature_2m),
          feels: Math.round(data.current.apparent_temperature),
          hum: data.current.relative_humidity_2m,
          wind: Math.round(data.current.wind_speed_10m),
          code: codes[data.current.weather_code] || 'Облачно',
          lat, lon
        };
        initIcons();
      } catch (e) {
        error.value = "Ошибка при получении данных о погоде";
      }
    };

    // Поиск города
    const handleSearch = async () => {
      if (!cityInput.value.trim()) return;
      loading.value = true;
      error.value = null;
      try {
        const geo = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityInput.value)}&count=1&language=ru`);
        const gData = await geo.json();
        if (!gData.results || gData.results.length === 0) throw new Error("Город не найден");
        const c = gData.results[0];
        await getWeather(c.latitude, c.longitude, c.name, c.country);
      } catch (e: any) {
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    };

    // Определение местоположения
    const handleGeo = () => {
      if (!navigator.geolocation) {
        error.value = "Геолокация не поддерживается";
        return;
      }
      loading.value = true;
      navigator.geolocation.getCurrentPosition(
        p => getWeather(p.coords.latitude, p.coords.longitude).finally(() => loading.value = false),
        () => {
          error.value = "Доступ к местоположению отклонен";
          loading.value = false;
        }
      );
    };

    onMounted(initIcons);

    return { cityInput, weather, loading, error, handleSearch, handleGeo };
  },
  template: `
    <div class="max-w-xl mx-auto p-4 md:p-8 pt-12 md:pt-20">
      <div class="text-center mb-10">
        <h1 class="text-4xl font-black mb-2 tracking-tight">ПОГОДА</h1>
        <p class="text-slate-400">Укажите город или используйте GPS</p>
      </div>

      <div class="flex gap-2 mb-8">
        <input 
          v-model="cityInput" 
          @keyup.enter="handleSearch" 
          placeholder="Найти город..." 
          class="flex-1 bg-slate-800/50 border border-slate-700 p-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-lg" 
        />
        <button @click="handleSearch" :disabled="loading" class="bg-blue-600 px-6 rounded-2xl hover:bg-blue-500 disabled:opacity-50 transition-all flex items-center justify-center">
          <i data-lucide="search" class="w-6 h-6"></i>
        </button>
        <button @click="handleGeo" class="bg-slate-800 px-5 rounded-2xl hover:bg-slate-700 transition-all flex items-center justify-center">
          <i data-lucide="map-pin" class="w-6 h-6 text-blue-400"></i>
        </button>
      </div>

      <div v-if="error" class="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-2xl mb-6 text-center text-sm">
        {{ error }}
      </div>

      <div v-if="weather" class="glass rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-500">
        <div class="p-8 text-center border-b border-white/5 bg-gradient-to-b from-blue-600/10 to-transparent">
          <p class="text-blue-400 font-bold uppercase tracking-widest text-xs mb-2">{{ weather.region }}</p>
          <h2 class="text-4xl font-extrabold mb-6">{{ weather.city }}</h2>
          <div class="flex flex-col items-center">
            <span class="text-8xl font-thin tracking-tighter">{{ weather.temp }}°</span>
            <p class="text-xl font-medium mt-2">{{ weather.code }}</p>
            <p class="text-slate-400 text-sm mt-1">Ощущается как {{ weather.feels }}°</p>
          </div>
        </div>
        
        <div class="grid grid-cols-2">
          <div class="p-6 text-center border-r border-white/5">
            <i data-lucide="droplets" class="w-5 h-5 mx-auto mb-2 text-blue-400"></i>
            <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Влажность</p>
            <p class="text-xl font-bold">{{ weather.hum }}%</p>
          </div>
          <div class="p-6 text-center">
            <i data-lucide="wind" class="w-5 h-5 mx-auto mb-2 text-blue-400"></i>
            <p class="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Ветер</p>
            <p class="text-xl font-bold">{{ weather.wind }} км/ч</p>
          </div>
        </div>

        <div class="p-4 bg-white/5 text-center">
           <a :href="'https://www.google.com/maps?q=' + weather.lat + ',' + weather.lon" target="_blank" 
             class="text-blue-400 hover:text-blue-300 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
             <i data-lucide="map" class="w-3 h-3"></i> Открыть карту
           </a>
        </div>
      </div>

      <div v-else-if="!loading" class="text-center py-20 opacity-20">
        <i data-lucide="cloud-sun" class="w-16 h-16 mx-auto mb-4"></i>
        <p class="font-medium">Здесь появится прогноз</p>
      </div>
      
      <div v-if="loading" class="text-center py-20">
        <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p class="text-slate-400">Загрузка данных...</p>
      </div>
    </div>
  `
});

createApp(App).mount('#root');
